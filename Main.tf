module "ecr" {
  source = "./modules/ecr"
}

module "networking" {
  source = "./modules/networking"

  availability_zones     = var.availability_zones
  vpc_cidr               = var.vpc_cidr
  public_subnet_cidr     = var.public_subnet_cidr
  private_subnet_cidr    = var.private_subnet_cidr
  private_db_subnet_cidr = var.private_db_subnet_cidr
}

module "eks" {
  source = "./modules/eks"

  private_subnet_ids = module.networking.private_subnet_ids
  vpc_id             = module.networking.vpc_id

  depends_on = [module.networking]
}

module "rds" {
  source = "./modules/rds"

  private_db_subnet_ids        = module.networking.private_db_subnet_ids
  node_group_security_group_id = module.eks.node_group_security_group_id
  vpc_id                       = module.networking.vpc_id
  db_username                  = var.db_username
  db_password                  = var.db_password

  depends_on = [module.networking, module.eks]
}

module "kubernetes" {
  source = "./modules/kubernetes"

  frontend_image_uri     = var.frontend_image_uri
  backend_image_uri      = var.backend_image_uri
  db_endpoint            = module.rds.db_endpoint
  db_username            = var.db_username
  db_password            = var.db_password
  vpc_id                 = module.networking.vpc_id
  lb_controller_role_arn = module.eks.lb_controller_role_arn

  depends_on = [module.eks, module.rds, module.networking]
}