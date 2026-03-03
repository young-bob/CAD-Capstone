#!/bin/bash
cd /home/admin/vsms
zcat web.tgz | sudo podman load 
sudo podman compose -f podman-compose.web.yml up -d 
sudo podman images --filter "dangling=true" -q | xargs -r sudo podman rmi
rm web.tgz
