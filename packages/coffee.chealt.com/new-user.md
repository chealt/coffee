# Description

This document describes how to add a new user to the application.

## Turso

- create a database in the users group with the name of the username
- add passkeys and users tables
- add the turso url and auth token to the env

## Cloudflare

- create a bucket in R2 with the username
- add the custom domain with the username as the subdomain (e.g.: username.coffee.chealt.com)
- create API token for R2
- add the key id and secret to the env
