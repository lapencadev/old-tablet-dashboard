# Feature Implementation Spec: La misma guía en español

## Source Feature

- `id`: docs-guide-es · `area`: docs · `depends_on`: docs-guide-en · `source`: `feature_list.json`

## Goal

docs/es/guia.md mirrors docs/guide.md with the Spanish Home Assistant UI names (Configuración, Aplicaciones, Instalar aplicación…).

## Non-Goals

- Translating the harness docs

## Acceptance Scenarios

### Scenario 1

Given a Spanish speaker  
When they follow docs/es/guia.md  
Then the same steps appear with the Spanish Home Assistant names (Configuración, Aplicaciones, Instalar aplicación, Aplicación Companion)

## Technical Approach

- Same heading structure as the English guide (tested)

## Expected File Changes

- `docs/es/guia.md`

## Visual Design Impact

- UI involved: no

## Verification Plan

- Same sections as the English guide.

## Evidence To Capture

- Scenario output of the commands above, recorded in `feature_list.json`.
