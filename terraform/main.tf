terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# IAM Role para Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-ai-proxy-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach managed policy para logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-ai-proxy"
  retention_in_days = 7
}

# Lambda Function
resource "aws_lambda_function" "ai_proxy" {
  filename         = "${path.module}/../lambda/function.zip"
  function_name    = "${var.project_name}-${var.environment}-ai-proxy"
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../lambda/function.zip")
  runtime          = "nodejs20.x"
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory_size

  environment {
    variables = {
      NODE_ENV         = var.environment == "prod" ? "production" : "development"
      OPENAI_API_KEY   = var.openai_api_key
      DEFAULT_AI_MODEL = var.default_ai_model
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_logs
  ]
}

# API Gateway HTTP API
resource "aws_apigatewayv2_api" "ai_proxy_api" {
  name          = "${var.project_name}-${var.environment}-ai-proxy-api"
  protocol_type = "HTTP"
  description   = "API Gateway for AI Proxy Lambda - Mobile Accenture"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "ai_proxy_stage" {
  api_id      = aws_apigatewayv2_api.ai_proxy_api.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}-ai-proxy"
  retention_in_days = 7
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.ai_proxy_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ai_proxy.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "suggest_route" {
  api_id    = aws_apigatewayv2_api.ai_proxy_api.id
  route_key = "POST /suggest"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "health_route" {
  api_id    = aws_apigatewayv2_api.ai_proxy_api.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai_proxy.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ai_proxy_api.execution_arn}/*/*"
}

# Outputs
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_apigatewayv2_api.ai_proxy_api.api_endpoint}/${var.environment}"
}

output "suggest_endpoint" {
  description = "Full URL for suggest endpoint"
  value       = "${aws_apigatewayv2_api.ai_proxy_api.api_endpoint}/${var.environment}/suggest"
}

output "health_endpoint" {
  description = "Full URL for health check endpoint"
  value       = "${aws_apigatewayv2_api.ai_proxy_api.api_endpoint}/${var.environment}/health"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.ai_proxy.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.ai_proxy.arn
}
