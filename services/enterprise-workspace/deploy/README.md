# Workspace deployment

This directory describes the workspace service. It does not publish an image.

The isolation matrix covers list, id, search, cache, event, download, tool, approval, and member. A restore compares directory ids with gateway ids. Local Pi history is not imported.

D01 and D02 are unsigned, so the production exit stays closed. `verify:workspace-deployment -- --profile=staging` exits 2.
