var fs = require( 'fs' );
var path = require( 'path' );

fs.writeFileSync(
    path.join( 'dist', 'logo.svg' ),
    fs.readFileSync( 'logo.svg', 'utf-8' ),
    'utf8'
);