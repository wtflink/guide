# Guide

A guide who guide you though the trails between you and the great internet.

# Design

選擇使用 PostgreSQL 和 Redis 除了使用上熟悉以外，也考慮了水平擴展的可能性及容易度。
3rd party library 也是以使用熟悉度以及其實作上設計完善度、測試覆蓋率等等來做評估。

# Setup

Copy .env config template and edit them.

```sh
$ cp .env.sample .env
$ code ./.env
```

Install the dependencies.

```sh
$ yarn
```

# Test

```sh
$ yarn test-only
```

# Developing

```sh
$ yarn dev
```

# Run app server

```sh
## make sure that lib is up to date with the source.
$ yarn build

## if built earlier, can run directly.
$ yarn run
```

# APIs

- [GET /<trail_id>](#get-trail)
- [POST /api/v1/create_trail](#create-trail)

## <a name="get-trail"> `GET /<trail_id>`

Query the trail by the given trail id.
Redirect to the url that provided on the trail creation.
If none trail found, return 404 no found instead.

### Examples:

#### Request:

```
GET https://your-domain.com/1U2qMi
```

#### Response:

```
HTTP/1.1 302 Found
Location: https://dcard.tw
Content-Type: text/html; charset=utf-8
Content-Length: 63
Date: Mon, 17 Jan 2022 06:11:38 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

## <a name="create-trail"> `POST /api/v1/create_trail`

Create trail so that other people can follow the direction.
Provided your destination url and the expiration for this trail,
the guide will generate an unique trail id for accessing this trail later.

### Request Body:

- url:
  - The destination url of the trail is about to be created.
  - The url provided should be a valid [RFC 3989](https://datatracker.ietf.org/doc/html/rfc3986) URI.
- expireAt:
  - The expire time of the trail is about to be created.
  - If the trail expire time is earlier than the current time, the trail will be ignored.
  - The expire time provided should be a valid [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) date format.
  - The expire time provided should be later than the current server time.

### Examples:

#### Request:

```
POST https://your-domain.com/api/v1/create_trail
```

#### Request Body:

```json
{
  "url": "https://google.com",
  "expireAt": "2022-01-20T00:00:00"
}
```

#### Response body:

```json
{
  "id": "TKLLPl",
  "shortUrl": " https://your-domain.com/TKLLPl",
  "expireAt": "2022-01-19T16:00:00.000Z"
}
```
