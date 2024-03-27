import type Timer from '../../index';

function invoke<C>( method: Function, context: C ) {
    return function ( this: Timer, ...args: Array<any> ) {
        if( this.disposed ) { return };
        return method.apply( this, args );
    };
}

export default invoke;