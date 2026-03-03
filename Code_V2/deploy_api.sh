ssh aws_brad "/home/admin/vsms/api_cleanup.sh"
ssh aws_boyang "/home/admin/vsms/api_cleanup.sh"
ssh aws_marieth "/home/admin/vsms/db_cleanup.sh"
ssh aws_marieth "/home/admin/vsms/db_deploy.sh"
docker compose -f podman-compose.api.yml build
sleep 3
home_folder=$(pwd)
cd "$home_folder/backend/VSMS.Infrastructure"
dotnet ef database update --startup-project ../VSMS.Api
cd "$home_folder"
docker save vsms-api:latest | gzip > api.tgz
scp api.tgz aws_boyang:~/vsms/
scp api.tgz aws_brad:~/vsms/
rm api.tgz
ssh aws_brad "/home/admin/vsms/api_deploy.sh"
ssh aws_boyang "/home/admin/vsms/api_deploy.sh"
