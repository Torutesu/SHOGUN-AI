//! Shared application data directory (`directories` crate).

use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

const QUALIFIER: &str = "ai";
const ORG: &str = "Shogun";
const APP: &str = "ShogunAI3";

pub fn app_data_dir() -> Result<PathBuf, String> {
  let dirs = ProjectDirs::from(QUALIFIER, ORG, APP).ok_or_else(|| "could not resolve app data directory".to_string())?;
  let dir = dirs.data_dir().to_path_buf();
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir)
}
