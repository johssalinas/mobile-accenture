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
