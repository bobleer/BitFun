use super::{
    build_shared_memory_policy_sections, ensure_memory_store_files, format_path_for_prompt,
    list_memory_files, memory_store_dir_path_impl, SharedMemoryPolicyProfile, MEMORY_INDEX_FILE,
    MEMORY_INDEX_MAX_LINES, TOPIC_MEMORY_MAX_FILES,
};
use crate::util::errors::*;
use tokio::fs;

pub(crate) async fn build_memory_prompt(workspace_root: &std::path::Path) -> BitFunResult<String> {
    ensure_memory_store_files(workspace_root).await?;

    let memory_dir = memory_store_dir_path_impl(workspace_root);
    let memory_dir_display = format_path_for_prompt(&memory_dir);

    Ok(format!(
        "# auto memory\n\n\
You have a persistent, file-based memory system at `{}`. This directory already exists — write to it directly with the Write/Edit tool (do not run mkdir or check for its existence).\n\n\
        You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.\n\n\
        {}",
        memory_dir_display,
        build_shared_memory_policy_sections(MEMORY_INDEX_FILE, SharedMemoryPolicyProfile::Full)
    ))
}

pub(crate) async fn build_memory_files_context(
    workspace_root: &std::path::Path,
) -> BitFunResult<Option<String>> {
    ensure_memory_store_files(workspace_root).await?;

    let memory_dir = memory_store_dir_path_impl(workspace_root);
    let memory_files_section = build_memory_space_files_section(&memory_dir).await?;
    if memory_files_section.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(memory_files_section))
    }
}

async fn build_memory_space_files_section(memory_dir: &std::path::Path) -> BitFunResult<String> {
    let index_path = memory_dir.join(MEMORY_INDEX_FILE);
    let memory_dir_display = format_path_for_prompt(memory_dir);
    let (index_content, index_description_suffix) = match fs::read_to_string(&index_path).await {
        Ok(content) if !content.trim().is_empty() => {
            let lines = content.lines().collect::<Vec<_>>();
            let was_truncated = lines.len() > MEMORY_INDEX_MAX_LINES;
            (
                lines
                    .into_iter()
                    .take(MEMORY_INDEX_MAX_LINES)
                    .collect::<Vec<_>>()
                    .join("\n"),
                if was_truncated {
                    format!(" Showing up to {MEMORY_INDEX_MAX_LINES} lines.")
                } else {
                    String::new()
                },
            )
        }
        _ => (String::new(), String::new()),
    };
    let index_body = if index_content.trim().is_empty() {
        format!("({MEMORY_INDEX_FILE} is empty)")
    } else {
        index_content
    };

    let memory_files = list_memory_files(memory_dir).await?;

    let topic_description_suffix = if memory_files.len() > TOPIC_MEMORY_MAX_FILES {
        format!(" Showing up to {TOPIC_MEMORY_MAX_FILES} entries.")
    } else {
        String::new()
    };
    let topic_files_content = if memory_files.is_empty() {
        "(no topic memory files yet)".to_string()
    } else {
        memory_files
            .into_iter()
            .take(TOPIC_MEMORY_MAX_FILES)
            .map(|file_name| format!("- `{}`", file_name))
            .collect::<Vec<_>>()
            .join("\n")
    };

    Ok(format!(
        r#"# memory_files
Persistent memory files currently available in `{memory_dir_display}`.

## {MEMORY_INDEX_FILE}
High-level index for the durable workspace memory space.{index_description_suffix}
{index_body}

## topic_memory_files
Topic-oriented durable memory files available in this workspace.{topic_description_suffix}
{topic_files_content}"#
    ))
}
