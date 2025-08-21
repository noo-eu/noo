# Add event notification webhooks to your organization

Event webhooks let your systems react to changes in your tenant—like new users, password resets, or app configuration updates—without polling. You’ll register an HTTPS endpoint, choose which events you want to receive, and verify deliveries.

## Prerequisites

You must be signed in as a Tenant Administrator with permission to manage webhooks.
Your endpoint must accept `POST` requests over HTTPS and return a `2xx` status within the timeout window. Use a stable URL and a valid TLS certificate. Plan to store a signing secret and verify signatures on every delivery.

## Steps

1. Open the Admin Console and go to **Settings → Webhooks**. Select **Add endpoint**.
2. Enter the **Endpoint URL** where you want to receive events, then generate a **Signing secret**. Store this secret securely; you will need it to verify requests.
3. Choose the **events** you want to receive. Typical choices include user lifecycle events (user created, invited, activated), credential changes (password updated), and admin actions (client created, policy changed).
4. Save the endpoint. Enable **retries** if they are not on by default so failed deliveries are attempted again.
5. Send a **test event** from the console to confirm that your endpoint receives and acknowledges deliveries.
6. In your service, verify each request using the signing secret and a timestamp to protect against tampering and replay. Respond with a `2xx` as soon as the payload is accepted; process the event asynchronously.

## Verify

After saving, the endpoint appears in the Webhooks list with a status of **Active**. The test event should show a `2xx` response in the delivery log along with a recent timestamp. If you trigger a real event—for example, by creating a user—you should see a matching entry in your system logs with the same event ID shown in the console.

## Security considerations

Treat the signing secret like a credential and rotate it periodically. Verify signatures and timestamps on every request and refuse replays. Implement **idempotency** by using the event’s unique ID so that retries don’t duplicate work. Keep the handler fast: validate, enqueue, return `2xx`; do the heavy lifting off the request thread. If your organization uses network controls, consider allowing our delivery IP ranges or a specific CIDR list. Never include secrets in query strings; prefer headers for authentication and signatures.

**Signature verification (example)**
The common pattern is `HMAC-SHA256(secret, timestamp + "." + raw_body)`. Compare the computed digest with the signature header using a constant-time comparison, and reject requests with an old timestamp.

```python
import hmac, hashlib, time

def is_valid(signature_header, timestamp_header, raw_body, secret):
    # Reject old timestamps (e.g., more than 5 minutes)
    if abs(time.time() - int(timestamp_header)) > 300:
        return False
    payload = f"{timestamp_header}.{raw_body}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

## Troubleshooting

* Deliveries show `4xx` from your endpoint. Confirm the URL path and any auth your endpoint expects. If you changed the signing secret, update your service and resend.
* Deliveries time out. Ensure your handler acknowledges quickly. Parse, enqueue, return `2xx`; do not perform long-running work before responding.
* Signatures don’t match. Check that you verify against the **raw** request body and the exact timestamp and signature headers. Differences in whitespace or JSON re-serialization will break verification.
* Duplicate processing. Implement idempotency using the event ID. Keep a short-lived store of processed IDs to ignore repeats.
* TLS errors. Use a publicly trusted certificate and ensure the endpoint supports modern TLS. Some environments require SNI; verify your load balancer configuration.

## Learn more

See the **webhooks concept** for delivery semantics (at-least-once, ordering, retries) and security model, and the **event reference** for the full catalog and payload schemas.
