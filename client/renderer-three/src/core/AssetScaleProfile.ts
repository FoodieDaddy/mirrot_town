export const ASSET_SCALE_PROFILE = {
    building: {
        defaultScale: 2.5,
        maxHeight: 3.5, // Further lowered from 3.8
        footprintScale: 1
    },
    road: {
        defaultScale: 2,
        maxHeight: 0.15
    },
    nature: {
        defaultScale: 1,
        maxHeight: 4.0
    },
    character: {
        defaultScale: 1.0, // Increased from 0.8
        maxHeight: 1.6 // Increased from 1.5
    },
    prop: {
        defaultScale: 1,
        maxHeight: 1.5
    },
    resourceNode: {
        defaultScale: 1,
        maxHeight: 2
    }
};
