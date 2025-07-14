#!/bin/bash

set -e

useradd -m -s /bin/bash www
usermod -aG docker www

sudo -u www bash -c 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
sudo -u www bash -c '[ -f ~/.ssh/id_rsa ] || ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa'

echo "🔐 Public Key (add in GitHub Actions Secrets as SSH_PUBLIC_KEY):"
cat /home/www/.ssh/id_rsa.pub
echo ""
echo "🗝️ Privat Key (add inGitHub Actions Secrets as SSH_PRIVATE_KEY):"
cat /home/www/.ssh/id_rsa

mkdir -p /home/www/md2pdf
chown -R www:www /home/www/md2pdf

mkdir -p /var/www
ln -sfn /home/www/md2pdf /var/www/md2pdf


# chmod +x setup-www.sh
# sudo ./setup-www.sh