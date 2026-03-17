variable "private_db_subnet_ids" {
    type = list(string)
}

variable "node_group_security_group_id" {
  type = string
}

variable "vpc_id" {
    type = string
}


variable "db_username" {
  type = string
}

variable "db_password" {
  type = string
}