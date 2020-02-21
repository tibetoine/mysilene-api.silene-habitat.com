/* memcached */
const memjs = require('memjs')

var memcached = new Memcached();

memcached.connect( 'localhost:11211', function( err, conn ){
    if( err ) {
    console.log( conn.server,'error while memcached connection!!');
    }
    });