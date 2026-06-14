import fs from 'fs/promises';
import path from 'path';

// Note: Real GLB parsing for bounds is best done in Three.js.
// This script applies improved heuristics based on actual model categories
// to move away from 2x2x2 placeholders.

async function main() {
  console.log('Updating asset bounds (Improved Heuristics)...');

  const manifestPath = path.resolve('assets/manifest/asset-manifest.json');
  const manifestData = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

  for (const asset of manifestData.assets) {
    let rawSize = { width: 1, height: 1, depth: 1 };
    let recommendedScale = 1.0;

    // Heuristics based on path/ID keywords
    const lowerId = asset.id.toLowerCase();
    
    if (asset.type === 'building') {
      rawSize = { width: 1.5, height: 2.0, depth: 1.5 };
      recommendedScale = 2.2; // Normalize to ~4.4m height
      if (lowerId.includes('townhall')) {
        rawSize = { width: 3.0, height: 3.5, depth: 3.0 };
        recommendedScale = 1.3;
      }
    } else if (asset.type === 'character') {
      rawSize = { width: 0.8, height: 1.8, depth: 0.8 };
      recommendedScale = 0.7; // Normalize to ~1.26m
    } else if (asset.type === 'nature') {
      if (lowerId.includes('tree')) {
        rawSize = { width: 2.5, height: 4.5, depth: 2.5 };
        recommendedScale = 1.0;
      } else {
        rawSize = { width: 1.0, height: 0.5, depth: 1.0 };
        recommendedScale = 1.2;
      }
    } else if (asset.type === 'road') {
      rawSize = { width: 2.0, height: 0.1, depth: 2.0 };
      recommendedScale = 1.0;
    } else if (asset.type === 'prop') {
      rawSize = { width: 0.5, height: 0.5, depth: 0.5 };
      recommendedScale = 1.0;
    }

    asset.rawSize = rawSize;
    asset.recommendedScale = recommendedScale;
    asset.normalizedSize = {
      width: Number((rawSize.width * recommendedScale).toFixed(2)),
      height: Number((rawSize.height * recommendedScale).toFixed(2)),
      depth: Number((rawSize.depth * recommendedScale).toFixed(2))
    };
    
    // Update collision to match normalized size
    asset.collision = {
      type: "box",
      ...asset.normalizedSize
    };
    
    asset.suggestedCollision = { ...asset.collision };
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2));
  console.log('✅ asset-manifest.json updated with improved size metadata.');

  const report = `# Asset Bounds Report
- Heuristic-based normalization applied to ${manifestData.assets.length} assets.
- Integrated recommendedScale to maintain town proportions.
- Collision boxes synchronized with visual normalization.
`;
  await fs.writeFile('assets/manifest/asset-bounds-report.md', report);
}

main().catch(console.error);
