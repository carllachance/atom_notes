#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::env;

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct GmailListResponse {
    messages: Option<Vec<GmailMessageRef>>,
}

#[derive(Debug, Deserialize)]
struct GmailMessageRef {
    id: String,
}

#[derive(Debug, Deserialize)]
struct GmailMessageResponse {
    payload: Option<GmailPayload>,
}

#[derive(Debug, Deserialize)]
struct GmailPayload {
    headers: Option<Vec<GmailHeader>>,
}

#[derive(Debug, Deserialize)]
struct GmailHeader {
    name: String,
    value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailCleanupSenderCandidate {
    sender: String,
    message_count: usize,
    latest_subject: String,
    has_list_unsubscribe: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailCleanupAnalysis {
    source: String,
    scanned_message_count: usize,
    unsubscribe_candidate_count: usize,
    sender_candidates: Vec<GmailCleanupSenderCandidate>,
    summary: String,
    generated_at: u64,
    unavailable_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphMessageSenderEmail {
    address: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GraphMessageSender {
    email_address: GraphMessageSenderEmail,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OutlookMessage {
    id: String,
    subject: Option<String>,
    body_preview: Option<String>,
    received_date_time: Option<String>,
    importance: Option<String>,
    web_link: Option<String>,
    from: Option<GraphMessageSender>,
}

#[derive(Debug, Deserialize)]
struct OutlookMessagesResponse {
    value: Vec<OutlookMessage>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutlookUnreadMessage {
    id: String,
    from: String,
    subject: String,
    preview: String,
    received_at: String,
    importance: String,
    web_link: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutlookUnreadAnalysis {
    source: String,
    unread_count: usize,
    urgent_count: usize,
    messages: Vec<OutlookUnreadMessage>,
    summary: String,
    generated_at: u64,
    unavailable_reason: Option<String>,
}

#[derive(Default)]
struct SenderAggregate {
    sender: String,
    message_count: usize,
    latest_subject: String,
    has_list_unsubscribe: bool,
    is_bulk_like: bool,
}

fn normalize_sender(value: &str) -> String {
    if let Some(start) = value.find('<') {
        if let Some(end) = value[start + 1..].find('>') {
            return value[start + 1..start + 1 + end].trim().to_lowercase();
        }
    }
    value.trim().to_lowercase()
}

fn header_value<'a>(headers: &'a [GmailHeader], name: &str) -> Option<&'a str> {
    headers
        .iter()
        .find(|header| header.name.eq_ignore_ascii_case(name))
        .map(|header| header.value.as_str())
}

async fn fetch_message_metadata(client: &Client, token: &str, message_id: &str) -> Result<Vec<GmailHeader>, String> {
    let response = client
        .get(format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}",
            message_id
        ))
        .bearer_auth(token)
        .query(&[
            ("format", "metadata"),
            ("metadataHeaders", "From"),
            ("metadataHeaders", "Subject"),
            ("metadataHeaders", "List-Unsubscribe"),
            ("metadataHeaders", "Precedence"),
        ])
        .send()
        .await
        .map_err(|error| format!("Failed to fetch Gmail message metadata: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("Gmail metadata request failed with {}", response.status()));
    }

    let payload = response
        .json::<GmailMessageResponse>()
        .await
        .map_err(|error| format!("Failed to decode Gmail metadata: {error}"))?;

    Ok(payload
        .payload
        .and_then(|payload| payload.headers)
        .unwrap_or_default())
}

#[tauri::command]
async fn analyze_gmail_cleanup(raw_intent_text: String, access_token: Option<String>) -> Result<GmailCleanupAnalysis, String> {
    let access_token = access_token
        .filter(|value| !value.trim().is_empty())
        .or_else(|| env::var("ATOM_NOTES_GMAIL_ACCESS_TOKEN").ok())
        .ok_or_else(|| "Set ATOM_NOTES_GMAIL_ACCESS_TOKEN or provide a temporary Gmail access token to enable live Gmail analysis.".to_string())?;

    let client = Client::builder()
        .user_agent("atom-notes-butler/0.1")
        .build()
        .map_err(|error| format!("Failed to initialize Gmail client: {error}"))?;

    let query = if raw_intent_text.to_lowercase().contains("spam") {
        "in:inbox newer_than:30d category:promotions OR has:list-unsubscribe"
    } else {
        "in:inbox newer_than:30d"
    };

    let response = client
        .get("https://gmail.googleapis.com/gmail/v1/users/me/messages")
        .bearer_auth(&access_token)
        .query(&[("maxResults", "25"), ("q", query)])
        .send()
        .await
        .map_err(|error| format!("Failed to query Gmail inbox: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("Gmail inbox query failed with {}", response.status()));
    }

    let list = response
        .json::<GmailListResponse>()
        .await
        .map_err(|error| format!("Failed to decode Gmail inbox query: {error}"))?;

    let message_refs = list.messages.unwrap_or_default();
    let mut aggregates: HashMap<String, SenderAggregate> = HashMap::new();

    for message in message_refs.iter().take(25) {
        let headers = fetch_message_metadata(&client, &access_token, &message.id).await?;
        let from = header_value(&headers, "From").unwrap_or("unknown sender");
        let sender = normalize_sender(from);
        let subject = header_value(&headers, "Subject").unwrap_or("").to_string();
        let has_list_unsubscribe = header_value(&headers, "List-Unsubscribe").is_some();
        let precedence = header_value(&headers, "Precedence").unwrap_or("").to_lowercase();
        let is_bulk_like = has_list_unsubscribe
            || precedence.contains("bulk")
            || precedence.contains("list")
            || sender.contains("newsletter")
            || sender.contains("noreply")
            || sender.contains("promo");

        let entry = aggregates.entry(sender.clone()).or_default();
        entry.sender = sender;
        entry.message_count += 1;
        entry.has_list_unsubscribe = entry.has_list_unsubscribe || has_list_unsubscribe;
        entry.is_bulk_like = entry.is_bulk_like || is_bulk_like;
        if entry.latest_subject.is_empty() && !subject.is_empty() {
            entry.latest_subject = subject;
        }
    }

    let mut candidates = aggregates
        .into_values()
        .filter(|candidate| candidate.is_bulk_like)
        .collect::<Vec<_>>();
    candidates.sort_by(|a, b| {
        b.message_count
            .cmp(&a.message_count)
            .then_with(|| b.has_list_unsubscribe.cmp(&a.has_list_unsubscribe))
            .then_with(|| a.sender.cmp(&b.sender))
    });

    let sender_candidates = candidates
        .iter()
        .take(8)
        .map(|candidate| GmailCleanupSenderCandidate {
            sender: candidate.sender.clone(),
            message_count: candidate.message_count,
            latest_subject: candidate.latest_subject.clone(),
            has_list_unsubscribe: candidate.has_list_unsubscribe,
        })
        .collect::<Vec<_>>();

    Ok(GmailCleanupAnalysis {
        source: "live".to_string(),
        scanned_message_count: message_refs.len(),
        unsubscribe_candidate_count: sender_candidates.len(),
        sender_candidates,
        summary: if candidates.is_empty() {
            "No strong bulk-mail candidates surfaced from the recent inbox scan.".to_string()
        } else {
            "Shortlisted likely newsletter or bulk senders from recent inbox metadata.".to_string()
        },
        generated_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or_default(),
        unavailable_reason: None,
    })
}

#[tauri::command]
async fn analyze_outlook_unread(_raw_intent_text: String, access_token: Option<String>) -> Result<OutlookUnreadAnalysis, String> {
    let access_token = access_token
        .filter(|value| !value.trim().is_empty())
        .or_else(|| env::var("ATOM_NOTES_OUTLOOK_ACCESS_TOKEN").ok())
        .ok_or_else(|| "Set ATOM_NOTES_OUTLOOK_ACCESS_TOKEN or provide a temporary Outlook access token to enable live Outlook analysis.".to_string())?;

    let client = Client::builder()
        .user_agent("atom-notes-butler/0.1")
        .build()
        .map_err(|error| format!("Failed to initialize Outlook client: {error}"))?;

    let response = client
        .get("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages")
        .bearer_auth(&access_token)
        .query(&[
            ("$top", "15"),
            ("$filter", "isRead eq false"),
            ("$orderby", "receivedDateTime desc"),
            ("$select", "id,subject,bodyPreview,receivedDateTime,importance,webLink,from"),
        ])
        .send()
        .await
        .map_err(|error| format!("Failed to query Outlook inbox: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("Outlook inbox query failed with {}", response.status()));
    }

    let payload = response
        .json::<OutlookMessagesResponse>()
        .await
        .map_err(|error| format!("Failed to decode Outlook inbox response: {error}"))?;

    let messages = payload
        .value
        .into_iter()
        .map(|message| OutlookUnreadMessage {
            id: message.id,
            from: message
                .from
                .map(|sender| sender.email_address.address)
                .unwrap_or_else(|| "unknown sender".to_string()),
            subject: message.subject.unwrap_or_else(|| "(no subject)".to_string()),
            preview: message
                .body_preview
                .unwrap_or_default()
                .chars()
                .take(160)
                .collect(),
            received_at: message.received_date_time.unwrap_or_default(),
            importance: message.importance.unwrap_or_else(|| "normal".to_string()),
            web_link: message.web_link,
        })
        .collect::<Vec<_>>();

    let urgent_count = messages
        .iter()
        .filter(|message| {
            message.importance.eq_ignore_ascii_case("high")
                || message.subject.to_lowercase().contains("urgent")
                || message.subject.to_lowercase().contains("asap")
                || message.subject.to_lowercase().contains("follow up")
        })
        .count();

    Ok(OutlookUnreadAnalysis {
        source: "live".to_string(),
        unread_count: messages.len(),
        urgent_count,
        summary: if messages.is_empty() {
            "No unread Outlook messages were returned from the inbox scan.".to_string()
        } else {
            "Summarized recent unread Outlook messages and highlighted likely urgent items.".to_string()
        },
        messages,
        generated_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or_default(),
        unavailable_reason: None,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![analyze_gmail_cleanup, analyze_outlook_unread])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
