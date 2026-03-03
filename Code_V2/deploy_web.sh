ssh aws_chunxi "/home/admin/vsms/web_cleanup.sh"
docker compose -f podman-compose.web.yml build
sleep 3
docker save vsms-web:latest | gzip > web.tgz
scp web.tgz aws_chunxi:~/vsms/
rm web.tgz
ssh aws_chunxi "/home/admin/vsms/web_deploy.sh"
