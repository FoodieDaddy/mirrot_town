export const ASSET_SCALE_PROFILE = {
    building: {
        defaultScale: 2.5,
        maxHeight: 3.8, // Lowered from 4.5
        footprintScale: 1
    },
    road: {
        defaultScale: 2,
        maxHeight: 0.15
    },
    nature: {
        defaultScale: 1,
        maxHeight: 4.0 // Lowered from 5.0
    },
    character: {
        defaultScale: 0.8, // Increased from 0.7
        maxHeight: 1.5 // Increased from 1.4
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
