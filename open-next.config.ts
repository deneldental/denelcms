const config = {
    default: {
        override: {
            wrapper: 'cloudflare',
            converter: 'edge',
        },
    },
    buildCommand: 'npm run build',
};

export default config;
