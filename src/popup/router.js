import Vue from 'vue'
import Router from 'vue-router'
import SignIn from './pages/SignIn.vue'
import CreateWallet from './pages/CreateWallet.vue'
import ImportWallet from './pages/ImportWallet.vue'
import Account from './pages/Account.vue'
import Tokens from './pages/Tokens.vue'
import Transfers from './pages/Transfers.vue'
import Transactions from './pages/Transactions.vue'
import Send from './pages/Send.vue'
import Receive from './pages/Receive.vue'
import PrivateKey from './pages/PrivateKey.vue'
import Freeze from './pages/Freeze.vue'
import Unfreeze from './pages/Unfreeze.vue'
import Votes from './pages/Votes.vue'
import About from './pages/About.vue'
import Dapps from './pages/Dapps.vue'
import Notifications from './pages/Notifications.vue'
import store from './store'

Vue.use(Router)

const router = new Router({
    routes: [
        {
            path: '/',
            name: 'account',
            component: Account,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/tokens',
            name: 'tokens',
            component: Tokens,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/transfers',
            name: 'transfers',
            component: Transfers,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/transactions',
            name: 'transactions',
            component: Transactions,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/send',
            name: 'send',
            component: Send,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/receive',
            name: 'receive',
            component: Receive,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/private-key',
            name: 'private-key',
            component: PrivateKey,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/freeze',
            name: 'freeze',
            component: Freeze,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/unfreeze',
            name: 'unfreeze',
            component: Unfreeze,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/votes',
            name: 'votes',
            component: Votes,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/about',
            name: 'about',
            component: About,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/dapps',
            name: 'dapps',
            component: Dapps,
            meta: {
                requiresAuth: true
            }
        },
        {
            path: '/signin',
            name: 'signin',
            component: SignIn,
            meta: {
                requiresKeystore: true
            }
        },
        {
            path: '/create-wallet',
            name: 'create-wallet',
            component: CreateWallet,
        },
        {
            path: '/import-wallet',
            name: 'import-wallet',
            component: ImportWallet
        },
        {
            path: '/notifications/:name',
            name: 'notifications',
            component: Notifications
        }
    ]
})

router.beforeEach((to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!store.state.wallet.keypass) {
            next({ path: '/signin' })
        }else {
            next()
        }
    }else if (to.matched.some(record => record.meta.requiresKeystore)) {
        if (!store.state.wallet.keystore) {
            next({ path: '/create-wallet' })
        }else {
            next()
        }
    }else {
        next()
    }
})

export default router
