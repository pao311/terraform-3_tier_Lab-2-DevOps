# DB Endpoint: URL with which the Backend will connect to the DB 
output "db_endpoint" {
  value = aws_db_instance.maindb.endpoint
}

output "db_name" {
  value = aws_db_instance.maindb.db_name
}