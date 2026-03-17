#=========================================================
# Subnet Group
# Registers the DB subnets with RDS so it knows in 
# which subnets to place the Primary and Standby instances
#=========================================================
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "db-subnet-group"
  subnet_ids = var.private_db_subnet_ids

  tags = { Name = "db-subnet-group" }
}

#==================================================
# Security Group for DB
#==================================================
resource "aws_security_group" "db_sg" {
  name        = "db_sg"
  vpc_id      = var.vpc_id

  tags = {
    Name = "db_sg"
  }
}

# Allows incoming traffic from the Node's SG on Port 5432 (PostgreSQL)
resource "aws_vpc_security_group_ingress_rule" "db_ingress_sg" {
  security_group_id = aws_security_group.db_sg.id
  referenced_security_group_id = var.node_group_security_group_id
  from_port         = 5432
  ip_protocol       = "tcp"
  to_port           = 5432
}

# Allows outbound traffic to everywhere
resource "aws_vpc_security_group_egress_rule" "db_egress_sg" {
  security_group_id = aws_security_group.db_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

#==================================================
# DB creation
#==================================================
resource "aws_db_instance" "maindb" {
  allocated_storage    = 20
  db_name              = "maindb"
  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.t3.micro"

  username             = var.db_username
  password             = var.db_password

  # Skips backup creation when deleting the DB
  skip_final_snapshot  = true

  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Multi_az: Creates Primary DB in one AZ and Standby in the other one. 
  # If primary fails, Standby takes control
  multi_az = true

  tags = { Name = "maindb" }
}