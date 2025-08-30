# Description

This document describes how to add a new user to the application.

## Turso

- create a database in the users group with the name of the username
- add passkeys and users tables
- add tables for collections, collection items and collection item images
- add the turso url and auth token to the env (.env locally, include in the client.js file inlined, add to cloudflare env as secrets)
