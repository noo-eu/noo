terraform {
  backend "s3" {
    bucket = "noo-tfstate"
    workspace_key_prefix = "network"
    key = "network.tfstate"

    region = "eu-central-1" # unused, but required

    endpoints = {
      s3 = "https://fsn1.your-objectstorage.com"
    }

    use_path_style = true
    skip_region_validation = true
    skip_credentials_validation = true
    skip_metadata_api_check = true
    skip_requesting_account_id = true
    skip_s3_checksum = true
    encrypt = true
  }
}
