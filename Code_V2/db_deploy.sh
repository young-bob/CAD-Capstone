#!/bin/bash
cd /home/admin/vsms
sudo podman compose -f podman-compose.db.yml up -d
