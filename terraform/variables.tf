variable "aws_region" {
  description = "AWS region donde se desplegará la infraestructura"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "mobile-accenture"
}

variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment debe ser: dev, staging, o prod"
  }
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "default_ai_model" {
  description = "Modelo de OpenAI por defecto"
  type        = string
  default     = "gpt-3.5-turbo"

  validation {
    condition     = can(regex("^(openai/)?(gpt-3.5-turbo|gpt-4|gpt-4-turbo|gpt-4o|gpt-4o-mini)$", var.default_ai_model))
    error_message = "default_ai_model debe ser un modelo válido de OpenAI (con o sin prefijo 'openai/')"
  }
}

variable "lambda_memory_size" {
  description = "Memoria asignada al Lambda en MB"
  type        = number
  default     = 512

  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "lambda_memory_size debe estar entre 128 y 10240 MB"
  }
}

variable "lambda_timeout" {
  description = "Timeout del Lambda en segundos"
  type        = number
  default     = 30

  validation {
    condition     = var.lambda_timeout >= 3 && var.lambda_timeout <= 900
    error_message = "lambda_timeout debe estar entre 3 y 900 segundos"
  }
}

variable "allowed_origins" {
  description = "Orígenes permitidos para CORS"
  type        = list(string)
  default     = ["*"]
}
