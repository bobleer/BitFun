use super::{
    ensure_memory_store_files, format_manifest_path, list_memory_files_recursive,
    memory_store_dir_path_impl, parse_memory_frontmatter, MEMORY_MANIFEST_MAX_FILES,
};
use crate::util::errors::*;
use tokio::fs;

pub(crate) async fn build_memory_manifest(
    workspace_root: &std::path::Path,
) -> BitFunResult<Option<String>> {
    ensure_memory_store_files(workspace_root).await?;

    let memory_dir = memory_store_dir_path_impl(workspace_root);
    let memory_files = list_memory_files_recursive(&memory_dir).await?;
    if memory_files.is_empty() {
        return Ok(None);
    }

    let mut entries = Vec::new();
    for path in memory_files.into_iter().take(MEMORY_MANIFEST_MAX_FILES) {
        let content = match fs::read_to_string(&path).await {
            Ok(content) => content,
            Err(_) => continue,
        };

        let frontmatter = parse_memory_frontmatter(&content);
        let relative_path = format_manifest_path(&path, &memory_dir);
        let type_prefix = frontmatter
            .as_ref()
            .and_then(|value| value.memory_type.as_deref())
            .map(|value| format!("[{}] ", value.trim()))
            .unwrap_or_default();

        let line = frontmatter
            .and_then(|value| value.description)
            .filter(|value| !value.trim().is_empty())
            .map(|description| {
                format!("- {}{}: {}", type_prefix, relative_path, description.trim())
            })
            .unwrap_or_else(|| format!("- {}{}", type_prefix, relative_path));

        entries.push(line);
    }

    if entries.is_empty() {
        Ok(None)
    } else {
        Ok(Some(entries.join("\n")))
    }
}
