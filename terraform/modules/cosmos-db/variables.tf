variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "suffix" {
  description = "Random suffix for unique naming"
  type        = string
}

variable "database_name" {
  description = "Name of the Cosmos DB database"
  type        = string
  default     = "projectpal"
}

variable "container_name" {
  description = "Name of the Cosmos DB container"
  type        = string
  default     = "conversations"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
