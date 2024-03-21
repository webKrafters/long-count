# Long Count
A persistent client-server coordinated storage based on client domain cookies with a local-storage fallback.

### Name:
<strong>@webkrafters/long-count</strong>

# Installation
npm install --save @webkrafters/long-count

# Usage

### In client-side code.

```jsx
import { discardClientStorage, getClientStorage } from '@webkrafters/universal-storage';

let storage = getClientStorage(); // establishes a client storage singleton

storage.current.setItem( 'key', 'value' );
storage.current.getItem( 'key' ); // 'value'
storage.current.removeItem( 'key' );

storage.current.getItem( 'key' ); // undefined
storage.current.setItem( 'key', 'value2' );
storage.current.getItem( 'key' ); // 'value2'

discardClientStorage(); // destroys the current client storage singleton

storage.current.getItem( 'key' ); // error! cannot read getItem of undefined; reading 'storage.current'

storage = getClientStorage(); // reestablishes a client storage singleton

storage.current.getItem( 'key' ); // 'value2' 
```

### In server-side code.

```jsx
import { discardServerStorage, getServerStorage } from '@webkrafters/universal-storage';

let storage = getServerStorage(); // establishes a client storage singleton

storage.current.setItem( 'key', 'value', e.response );
storage.current.getItem( 'key', e.request ); // 'value'
storage.current.removeItem( 'key', 'value', e.response );

storage.current.getItem( 'key', e.request ); // undefined
storage.current.setItem( 'key', 'value2', e.response );
storage.current.getItem( 'key', e.request ); // 'value2'

discardServerStorage(); // destroys the current client storage singleton

storage.current.getItem( 'key', e.request ); // error! cannot read getItem of undefined; reading 'storage.current'

storage = getServerStorage(); // reestablishes a client storage singleton

storage.current.getItem( 'key', e.request ); // 'value2' 
```

# License
MIT

