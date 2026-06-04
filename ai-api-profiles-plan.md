# AI API Profiles

## Goal
Support multiple AI API keys/profiles in Settings so users can switch provider credentials and switch commit/review models without re-entering config.

## Tasks
- [ ] Add `AIProviderProfile` helpers in `apps/desktop/src/lib/ai-profiles.ts` with `id`, `name`, `apiKey`, `apiUrl`, `commitModel`, `reviewModel`, `tokenLimit`, `fetchedModels`, `createdAt`, `updatedAt` -> Verify: helpers can load legacy single-profile localStorage and return one default active profile.
- [ ] Migrate legacy keys (`gitflowAiApiKey`, `gitflowAiApiUrl`, `gitflowAiModel`, `gitflowAiReviewModel`, `gitflowAiTokenLimit`, `gitflowAiFetchedModels`) into `gitflowAiProfiles` + `gitflowActiveAiProfileId` without deleting legacy values during migration -> Verify: existing user settings still populate Settings after reload.
- [ ] Update `SettingsDialog` AI state to edit the active profile instead of standalone `apiKey/apiUrl/model` fields -> Verify: Save writes the active profile and dispatches `gitflow-settings-updated`.
- [ ] Update `AITab` UI with a profile selector, add/duplicate/rename/delete actions, and keep the existing key/url/model controls bound to the selected profile -> Verify: switching profile changes API key, endpoint, commit model, review model, token limit, and fetched model list immediately in the form.
- [ ] Scope `handleFetchModels` to the active profile so fetched models are stored per profile, not globally -> Verify: fetching models for profile A does not change profile B's model list.
- [ ] Update `readAISettings()` in `apps/desktop/src/lib/ai.ts` to read the active profile first and fall back to legacy keys if no profile exists -> Verify: commit generation, diff review, commit explain, MR review, conflict explain, and risk summary all use the selected active profile.
- [ ] Add cache invalidation to include active profile id + model in AI response cache keys -> Verify: same prompt with different active profile/model does not reuse the old provider response.
- [ ] Keep non-credential AI preferences global (`detailLevel`, `commitStyle`, `customRules`, `reviewLanguage`, `reviewChecklist`) unless explicitly moved later -> Verify: changing profile does not reset review language/checklist.
- [ ] Add focused tests for profile migration/read/write helpers and `readAISettings()` fallback behavior -> Verify: `pnpm --dir apps/desktop test` passes.
- [ ] Run verification -> Verify: `pnpm --dir apps/desktop build` passes and manual Settings smoke covers add, switch, fetch models, save, reload.

## Done When
- [ ] Users can maintain multiple AI API profiles, switch active profile, and select separate commit/review models per profile.
- [ ] Existing single-key users keep working after upgrade.
- [ ] All AI call sites use the active profile without per-feature changes.

## Notes
- Store profiles in localStorage for v1 to match current Settings behavior; no backend/keychain migration in this task.
- Do not show full API keys by default; reuse the current masked key/show-hide behavior.
- Deleting the active profile should choose the next remaining profile, or create an empty default profile if none remain.
