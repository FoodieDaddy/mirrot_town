# Incoming Assets Report

## 1. Discovered Asset Packs

- Fantasy Props MegaKit[Standard].zip -> `assets/source/quaternius/fantasy-props`
- KayKit Mini-Game Variety Pack 1.2.zip -> `assets/source/kaykit/mini-game-variety-pack`
- KayKit_City_Builder_Bits_1.0_FREE.zip -> `assets/source/kaykit/city-builder-bits`
- kenney_building-kit.zip -> `assets/source/kenney/building-kit`
- kenney_retro-fantasy-kit.zip -> `assets/source/kenney/retro-fantasy-kit`
- Stylized Nature MegaKit[Standard].zip -> `assets/source/quaternius/stylized-nature`

## 2. Included Formats

- `.fbx`, `.obj`, `.mtl`, `.dae`, `.glb`, `.gltf`, `.png` textures.
- The packs generally provide multiple format options including modern glTF/GLB which is excellent for WebGL/Three.js.

## 3. Availability of GLB/GLTF

- **Yes**. All packs contain either `.glb` or `.gltf` formats out of the box.
- KayKit provides `.gltf.glb` files.
- Kenney provides `.glb` in a `GLB format` folder.
- Quaternius provides `.gltf` in a `glTF` folder and textures separately (or embedded). Actually, Quaternius usually embeds or provides `.gltf` with `.bin` and textures. We'll use a Node script to just copy the appropriate models or use the `.obj` if `.glb` is somehow difficult, but since these are standard, we can just copy them and Three.js will load them.

## 4. Need for Conversion

- The provided `.glb` files from KayKit and Kenney can be used directly without conversion.
- Quaternius `.gltf` files might come with `.bin` and textures, which we might want to pack into `.glb` later for production, but for v0.1 we can just use the provided formats or convert them using a command-line tool if strictly required. The script will handle copying them over.

## 5. License / Readme

- KayKit: CC0 / Free to use, included in readme/license.txt
- Kenney: CC0 Public Domain.
- Quaternius: CC0 / Free to use commercially.

## 6. Suitability for Three.js

- **Highly suitable**. These are low-poly, optimized assets that perform exceptionally well in WebGL/Three.js environments.

## 7. Suitability for Q-Town Style

- **Perfect match**. All of these are low-poly, stylized, cartoonish (Q-style) and fit the isometric 2.5D visual requirement perfectly.

## 8. Presence of High-Poly/Realistic Assets

- **None**. All discovered assets are low-poly and stylized. They are mobile-friendly.

## 9. Recommended for qtown_v0_1

- **KayKit City Builder Bits**: `house`, `shop`, `road` elements.
- **KayKit Mini-Game Variety Pack**: `character` (like dog or simple capsule characters) and simple props.
- **Kenney Retro Fantasy Kit**: `house`, `tent`, `crate`, `barrel`.
- **Quaternius Stylized Nature**: `tree`, `bush`, `rock`.
- **Quaternius Fantasy Props**: `table`, `chair`, `bed`, `barrel`, `wood`.

## 10. Assets Not Recommended for Runtime

- Source files like `.blend`, `.fbx`, `.obj` and raw texture files should remain in the `source` directory to keep the runtime payload small. We will only extract the required `.glb` files.
