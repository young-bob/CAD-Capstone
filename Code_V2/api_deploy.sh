#!/bin/bash
cd /home/admin/vsms
zcat api.tgz | sudo podman load 
sudo podman compose -f podman-compose.api.yml up -d 
sudo podman images --filter "dangling=true" -q | xargs -r sudo podman rmi
rm api.tgz
