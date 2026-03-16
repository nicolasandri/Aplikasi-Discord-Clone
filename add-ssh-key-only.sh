#!/bin/bash
# Add SSH key to VPS - Run this on VPS console

mkdir -p ~/.ssh
chmod 700 ~/.ssh

cat >> ~/.ssh/authorized_keys << 'PUBKEY'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCqKSVx2nhys6IJ4a4UpT5axETbFWObDmO70PsYXRQ8YAITYcPO7IzdwTxkI/c0XlfXFx4gPfR74qcKeoQ3UMTtojroTf9BSMT5pFoNcsPsha88S6mWLmX7BV41yoEzwU2HTedYxJacc4wiDyJNQ2V97j6/33zbvmOWS8BLpr7NFeFz+fTJEy5fIrLoR7CsgBkmKik37Vb6O6oHU8tIPIjvz2wN6LTMVPLLN7zlBT50/Y8M7QMTDTOpmxBu8W0wEAJZD5MmoSSLveujuw8F9H4oftzIDulzgLnfTS+dsrxm6u17KI+4WjrwrXTOYQyu+OBejjTZH9laUt+za236h4JuZ9k1HFRUIOIW22lDJTb4axmVrRsY9vDKzORygvaDfag4bCjL0qbetlwAgERk7gyrM1w7jkdmmAv3P10OuJRimch1rEFHDij1gsBmSs9aqrQT6RTNiSMgYBaI0nxz/ljv1bAseIm494+Ck81bMpkjRiqWHyZU/CYUkiktVO2ptPtQrljG8ZSe41S/HZ9hPGqKLZSz+DzjkS6K5wWmVw52LUzGJZISqsJyLyDWegpvitQd/HJLSGXVGqso8CdzX4yCUd6deW5iPOKYjqmKM/iygCyvWawoZ6lvTSrYY0rcO40VKh8C0CFNrVF1NEtYvWIV9+fHoFayih4WTr5w3nyYkw== workgrid-deploy-20260316
PUBKEY

chmod 600 ~/.ssh/authorized_keys
echo "SSH Key added successfully!"
echo "You can now connect via: ssh -i workgrid_deploy_key root@152.42.242.180"
