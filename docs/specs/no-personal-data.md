# Feature Implementation Spec: The repository contains no personal data

## Source Feature

- `id`: no-personal-data · `area`: platform · `depends_on`: quality-gate · `source`: `feature_list.json`

## Goal

The repo is public. A test fails the gate if any tracked (or new, not ignored) file contains a Telegram group id, a LAN address with port, a Tailscale address or machine name, an e-mail (except GitHub noreply / example.com), an HA token, or any word listed in `PRIVATE_WORDS` (env var, so the private names are not published).

## Acceptance Scenarios

1. Given the current tree, when the test runs with the owner's private words, then it passes.
2. Given a new file with a Telegram group id, when the test runs, then it fails naming file and line.

## Technical Approach

- `tests/test_no_personal_data.py` uses `git ls-files --cached --others --exclude-standard`; images are skipped.

## Verification Plan

- Run with `PRIVATE_WORDS=…` (owner's list) → OK; add a sample leak file → failure listing it.
