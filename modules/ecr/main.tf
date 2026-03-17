#=====================================================
# Creation of Front and Backend Repositories
#=====================================================

resource "aws_ecr_repository" "frontend_repo" {
  name         = "frontend-repo"
  force_delete = true
}

resource "aws_ecr_repository" "backend_repo" {
  name         = "backend-repo"
  force_delete = true
}