#===============================================
# Creates the main VPC
#===============================================
resource "aws_vpc" "main_vpc" {
  cidr_block       = var.vpc_cidr

  enable_dns_support = true
  enable_dns_hostnames = true

  tags = {
    Name = "main"
  }
}

#===============================================
# Creates Public Subnet for each AZ
# These Subnets will contain NAT Gateways
#===============================================
resource "aws_subnet" "public_subnet" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = element(var.public_subnet_cidr, count.index)
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    # Tags needed for the EKS cluster
    # Helps AWS determine where to locate the Internal/External Lod Balancers
    # 'elb' Indicates that this is a public subnet
    "kubernetes.io/role/elb" = "1"
    # 'main_cluster_eks' --> Our Cluster's name
    # 'owned' --> VPC resources are exclusively for this Cluster, they are not shared
    "kubernetes.io/cluster/main_cluster_eks" = "owned"
  }
}

#===============================================
# Creates Private Subnet for each AZ
# These subnets will contain both frontend and backend Pods
#===============================================
resource "aws_subnet" "private_subnet" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = element(var.private_subnet_cidr, count.index)
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    # 'internal-elb' indicates this is a private subnet
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/main_cluster_eks" = "owned"
  }
}

#===============================================
# Creates Private DB Subnet for each AZ
# Private subnets dedicated only to the DB
#===============================================
resource "aws_subnet" "private_db_subnet" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = element(var.private_db_subnet_cidr, count.index)
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    # 'elb' tag is skipped because DB subnets are not used for load balancers
    "kubernetes.io/cluster/main_cluster_eks" = "owned"
  }
}

# Internet Gateway for Public Subnets and for NAT Gateways
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name = "igw-3tier"
  }
}

# Elastic IP needed for NAT Gateway
resource "aws_eip" "nat_eip" {
  count = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "nat-eip-${count.index + 1}"
  }
}

# NAT Gateway for Private Subnets that contain frontend and backend
resource "aws_nat_gateway" "nat_gw" {
  count          = length(var.availability_zones)
  allocation_id  = aws_eip.nat_eip[count.index].id
  subnet_id      = aws_subnet.public_subnet[count.index].id

  tags = {
    Name = "nat-gw-3tier"
  }

  depends_on = [aws_internet_gateway.igw]
}

# Public Route Table that points to IGW
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "public-rt"
  }
}

# Associates previous Route Table to each Public Subnet created
resource "aws_route_table_association" "public_rta" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public_subnet[count.index].id
  route_table_id = aws_route_table.public_rt.id
}


# Private Route Table that points to NAT Gateway
resource "aws_route_table" "private_rt" {
  count = length(var.availability_zones)
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw[count.index].id
  }

  tags = {
    Name = "private-rt"
  }
}

# Associates previous Route Table to each Private Subnet created
resource "aws_route_table_association" "private_rta" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private_subnet[count.index].id
  route_table_id = aws_route_table.private_rt[count.index].id
}

# Associates same private Route Table to each DB Subnet created as well
resource "aws_route_table_association" "db_rta" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private_db_subnet[count.index].id
  route_table_id = aws_route_table.private_rt[count.index].id
}