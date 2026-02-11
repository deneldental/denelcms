const config = {
    default: {
        override: {
            wrapper: 'cloudflare',
            converter: 'edge',
            incrementalCache: 'dummy',
            tagCache: 'dummy',
            queue: 'dummy',
        },
    },
    buildCommand: 'npm run build',
};

export default config;
