# Data lifecycle

Updated: 2026-10-12

Audit records store the actor and the action. They do not store tokens, cookies, or the default request body.

A legal hold blocks deletion before any index or cache clear. Physical delete stays blocked until D02 is signed. Archive may clear the index and cache. `reconcile` lists ids that are expected and absent.

The production lifecycle gate stays closed.
