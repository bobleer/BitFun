use super::{
    ensure_markdown_placeholder, memory_store_dir_path_impl, migrate_legacy_memory_index,
    MEMORY_INDEX_FILE, MEMORY_INDEX_TEMPLATE,
};
use crate::util::errors::*;
use log::debug;
use std::path::{Path, PathBuf};
use tokio::fs;

pub(crate) fn memory_store_dir_path(workspace_root: &Path) -> PathBuf {
    memory_store_dir_path_impl(workspace_root)
}

pub(crate) async fn ensure_memory_store_files(workspace_root: &Path) -> BitFunResult<()> {
    let memory_dir = memory_store_dir_path_impl(workspace_root);
    if !memory_dir.exists() {
        fs::create_dir_all(&memory_dir).await.map_err(|e| {
            BitFunError::service(format!(
                "Failed to create memory directory {}: {}",
                memory_dir.display(),
                e
            ))
        })?;
    }
    migrate_legacy_memory_index(&memory_dir).await?;
    let created_memory_index =
        ensure_markdown_placeholder(&memory_dir.join(MEMORY_INDEX_FILE), MEMORY_INDEX_TEMPLATE)
            .await?;

    debug!(
        "Ensured memory store files: path={}, created_memory_index={}",
        workspace_root.display(),
        created_memory_index
    );

    Ok(())
}
