# Fabric coverage update

Book Pattern by Rob Tuytel, from [Poly Haven](https://polyhaven.com/a/book_pattern), is CC0. Its official API info/files responses and unchanged 1K originals are supplied here. The runtime uses 512px albedo and roughness JPEGs, with a 0.3 metre repeat, on previously solid cloth/tarp/seat materials.

The source MD5 values were verified against the official metadata before conversion. `manifest-fragment.json` records original and runtime hashes. `Fabric_Contact_Sheet.jpg` repeats the actual albedo four times for seam inspection; it is not a rendered game screenshot. The contact sheet was visually checked. In-game lighting and appearance still require a WebGL playtest.

Run `python tools/build-fabric-v118.py` with Pillow installed to rebuild from the cached originals. This writes the runtime maps and updates their manifest entries. No network access is needed for rebuilding, and players do not need Pillow. Run `node tools/check.mjs` after editing assets.

The pair adds 211,088 encoded bytes and roughly 2.67 MiB of RGBA8 storage including mip levels, before engine overhead. This is an estimate, not a GPU memory measurement. Existing surface maps are reused for all other newly covered palettes; no new normal/displacement maps or realtime reflections are added.
