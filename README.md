# Real-Time Poll Rooms

A full-stack application for creating and sharing real-time polls.

## Features

- **Instant Poll Creation**: Create polls with multiple options instantly.
- **Real-Time Updates**: Results update live for all users using WebSockets.
- **Shareable Links**: Unique, short URLs for every poll.
- **Fairness & Anti-Abuse**: Dual-layer protection against duplicate voting.
- **Persistent Storage**: All data is stored reliably in a PostgreSQL database.

## Fairness & Anti-Abuse Mechanisms

This application implements two distinct mechanisms to ensure poll integrity:

1.  **Browser Fingerprinting (Voter Token)**:
    - When a user visits a poll, a unique UUID (`voterToken`) is generated and stored in the browser's `localStorage`.
    - This token is sent with the vote request.
    - The server rejects any vote if the token has already been used for that poll.
    - **Prevents**: Casual re-voting by refreshing the page or navigating away and back.

2.  **IP Address Tracking**:
    - The server captures the IP address of every vote request.
    - If a vote for a specific poll is received from an IP address that has already voted, it is rejected.
    - **Prevents**: Incognito mode voting, clearing local storage, or using multiple browsers on the same device.

## Edge Cases Handled

- **Race Conditions**: Vote counting uses atomic database transactions to ensure accuracy even when multiple users vote simultaneously.
- **Concurrent Updates**: WebSockets broadcast updates to all connected clients immediately.
- **Invalid Polls**: Users navigating to non-existent poll IDs are shown a friendly 404 page.
- **Connection Loss**: The WebSocket client automatically attempts to reconnect if the connection is lost.

## Known Limitations

- **Shared Networks (NAT)**: The strict IP address checking means that multiple users on the same Wi-Fi network (e.g., coffee shop, office) may be unable to vote if they share a public IP.
- **No Moderation**: Currently, there is no way to report or delete abusive polls.
- **Poll Editing**: Polls cannot be edited after creation.
