import type { OpenNextConfig } from 'open-next/types/open-next';

const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: 'cloudflare-node',
            converter: 'edge',
            incrementalCache: 'dummy',
            tagCache: 'dummy',
            queue: 'dummy',
        },
    },
    buildCommand: 'npm run build',
};

export default config;
