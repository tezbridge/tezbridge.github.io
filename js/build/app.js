(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
const components = require('./components')

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    components,
    el: '#app',
    template: `
      <div class="body-wrapper">
        <div class="header">
          <img src="css/logo.png" />
          <setting-modal ref="setting" />
          <q-btn color="grey-6" icon="settings" flat round @click="$refs.setting.opened = true" size="md" />
        </div>
        <account-list />
      </div>
    `,
    data() {
      return {
      }
    },
    methods: {
    }
  })
})

},{"./components":2}],2:[function(require,module,exports){
const getLocal = x => JSON.parse(window.localStorage.getItem(x))
const setLocal = (x, y) => window.localStorage.setItem(x, JSON.stringify(y))
const removeLocal = x => window.localStorage.removeItem(x)

// init
const current_version = 0.12
const version = getLocal('v')
if (version < current_version) {
  setLocal('_', {})
  setLocal('*', {})
  removeLocal('__')
  setLocal('v', current_version)
}

const components = {}

components.Account = Vue.component('account', {
  components,
  template: `
    <div>
      <div v-if="locked">
        <q-field :error="!!password_error" :error-label="password_error" helper="Password for account decryption">
          <q-input color="cyan-8" @keyup.enter="unlock" v-model="password" type="password" float-label="Password" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" @click="unlock" label="Unlock" icon="lock open" outline />
          <q-btn color="red-6" @click="remove" label="Remove" icon="delete forever" outline />
        </div>
      </div>
      <div v-if="!locked">
        <q-list>
          <q-item>
            <q-item-side icon="account box" />
            <q-item-main>
              <q-item-tile label>Address</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="pkh_content">
                  {{public_key_hash}}
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copyToClipboard($refs.pkh_content, 'Address')" icon="content copy" />
            </q-item-side>
          </q-item>
          <q-item>
            <q-item-side icon="vpn lock" />
            <q-item-main>
              <q-item-tile label>Secret Key</q-item-tile>
              <q-item-tile sublabel>
                <p class="ellipsis" ref="sk_content">
                  ******
                </p>
              </q-item-tile>
            </q-item-main>
            <q-item-side>
              <q-btn flat @click="copySecretKey" icon="content copy" />
            </q-item-side>
          </q-item>
          <q-item>
            <q-item-side icon="account_balance_wallet" />
            <q-item-main>
              <q-item-tile label>Balance</q-item-tile>
              <q-item-tile sublabel><b>{{balance}}</b>tz</q-item-tile>
            </q-item-main>
            </q-item>
            <q-item>
              <q-item-side icon="vpn key" />
              <q-item-main>
                <q-item-tile label>Access code</q-item-tile>
                <q-item-tile sublabel>
                  <p class="ellipsis" ref="access_code">
                    {{access_code}}
                  </p>
                </q-item-tile>
              </q-item-main>
              <q-item-side>
                <q-btn flat @click="genAccessCode" icon="refresh" />
              </q-item-side>
            </q-item>
        </q-list>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="lock" label="Lock" icon="lock" />
          <q-btn push @click="faucet" label="Faucet" icon="opacity" />
        </div>
        <q-inner-loading :visible="loading">
        </q-inner-loading>
      </div>
    </div>
  `,
  props: ['account'],
  data() {
    return {
      locked: true,
      loading: false,
      tzclient: new TZClient(),
      password: '',
      password_error: '',

      balance: '0',
      public_key_hash: '',
      access_code: getLocal('__') ? 'Generated' : 'Ready to generate'
    }
  },
  methods: {
    genAccessCode() {
      const random_iv = window.crypto.getRandomValues(new Uint8Array(12))
      this.access_code = TZClient.libs.sodium.to_base64(random_iv)
      this.$refs.access_code.innerHTML = this.access_code

      this.tzclient.exportCipherData(this.access_code)
      .then(x => {
        setLocal('__', x)
      })
      .catch(() => alert('Encryption failed'))

      this.copyToClipboard(this.$refs.access_code, 'Access code')
    },
    copySecretKey() {
      this.$refs.sk_content.innerHTML = this.tzclient.key_pair.secret_key
      this.copyToClipboard(this.$refs.sk_content, 'Secret Key')
      setTimeout(() => {
        this.$refs.sk_content.innerHTML = '******'
      }, 2000)
    },
    copyToClipboard(elem, name) {
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(elem)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand("copy")
      this.$q.notify({
        color: 'positive',
        icon: 'done',
        timeout: 1500,
        message: name + ' copied'
      })
    },
    lock() {
      Object.assign(this.$data, this.$options.data())
    },
    faucet() {
      this.loading = true
      this.tzclient.faucet()
      .then(() => this.tzclient.balance())
      .then(x => {
        this.balance = TZClient.tz2r(x)
        this.loading = false
      })
    },
    remove() {
      this.$emit('remove')
    },
    unlock() {
      const tzclient = new TZClient()
      tzclient.importCipherData(this.account.cipherdata, this.password)
      .then(() => {
        this.locked = false
        this.tzclient = tzclient

        this.public_key_hash = this.tzclient.key_pair.public_key_hash
        this.tzclient.balance().then(x => this.balance = TZClient.tz2r(x))
      })
      .catch(err => {
        this.password_error = 'Password incorrect'
      })
    }
  }
})

components.AccountList = Vue.component('account-list', {
  components,
  template: `
    <q-list>
      <q-collapsible icon="account circle" :label="account.name" :key="account.name" v-for="account in accounts">
        <account :account="account" @remove="removeAccount(account)" />
      </q-collapsible>
      <q-collapsible icon="add" label="Add account" v-model="collapse.add">
        <gen-new-account @finish="newAccountFinish" />
      </q-collapsible>
    </q-list>
  `,
  data() {
    return {
      collapse: {
        add: false
      },
      accounts: getLocal('_')
    }
  },
  methods: {
    removeAccount(account) {
      this.$q.dialog({
        title: 'Removal confirmation',
        message: `Remove current account named ${account.name}?`,
        ok: 'OK',
        cancel: 'CANCEL'
      }).then(() => {
        const accounts = getLocal('_')
        delete accounts[account.name]
        setLocal('_', accounts)
        this.accounts = accounts
      }).catch(() => {})
    },
    newAccountFinish() {
      this.collapse.add = false
      this.accounts = getLocal('_')
    }
  }
})

components.NewAccountGuide = Vue.component('new-account-guide', {
  components,
  template: `
    <q-tabs inverted align="justify">
      <q-tab default name="import" slot="title" icon="move to inbox" label="Import" />
      <q-tab name="generate" slot="title" icon="person add" label="Generate" />

      <q-tab-pane name="import">
        <import-account @finish="finish"/>
      </q-tab-pane>
      <q-tab-pane name="generate">
        <gen-new-account @finish="finish"/>
      </q-tab-pane>
    </q-tabs>
  `,
  data() {
    return {

    }
  },
  methods: {
    finish() {
      this.$emit('finish')
    }
  }
})

const genTZclient = (tzclient_param, account_name, password) => {
  try {
    const tzclient = new TZClient(tzclient_param)

    return tzclient.exportCipherData(password)
    .then(result => {
      const accounts = getLocal('_')
      accounts[account_name] = {
        name: account_name,
        cipherdata: result
      }
      setLocal('_', accounts)
    })
  } catch (err) {
    return Promise.reject(err.toString())
  }
}


components.GenNewAccount = Vue.component('gen-new-account', {
  template: `
    <q-stepper color="cyan-8" v-model="current_step" vertical>

      <q-step default name="account_name" title="Set account name" active-icon="edit" icon="perm_identity">
        <q-field :error="!!account_name_error" :error-label="account_name_error" helper="Set the account display name">
          <q-input color="cyan-8" @keyup.enter="setAccountName" v-model="account_name" float-label="Account name" />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="setAccountName" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="password" title="Set password" active-icon="edit" icon="lock">
        <q-field :error="!!password_error" :error-label="password_error" helper="Set the account encryption password">
          <q-input color="cyan-8" v-model="password" type="password" float-label="Password" />
          <q-input color="cyan-8" @keyup.enter="confirmPassword" v-model="password_confirm" type="password" float-label="Password confirm"  />
        </q-field>
        <div class="center-wrapper">
          <q-btn color="cyan-8" outline @click="confirmPassword" label="Next" icon="arrow downward" />
        </div>
      </q-step>

      <q-step name="op_selection" title="Import or generate" active-icon="edit" icon="device hub">
        <div class="gutter-sm">
          <q-field label="Import" icon="move to inbox">
            <q-option-group
              color="cyan-8"
              type="radio"
              v-model="op_selection"
              :options="[
                { label: 'Mnemonic', value: 'mnemonic' },
                { label: 'Secret key', value: 'secret_key' },
                { label: 'Seed', value: 'seed' }
              ]"
            />
          </q-field>
          <q-field label="Generate" icon="person add">
            <q-radio color="cyan-8" v-model="op_selection" val="gen_mnemonic" label="Mnemonic" />
          </q-field>
        </div>
      </q-step>

      <q-step name="process" title="Process" active-icon="edit" icon="assignment">
        <div v-if="op_selection === 'gen_mnemonic'">
          <b class="mnemonic" v-for="word in gen_mnemonic">{{word}}</b>
          <q-field :error="!!gen_mnemonic_error" :error-label="gen_mnemonic_error" helper="Set the mnemonic passphrase">
            <q-input color="cyan-8" @keyup.enter="genMnemonic" v-model="gen_mnemonic_passphrase" type="password" float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="genMnemonic" label="Generate" />
          </div>
        </div>
        <div v-if="op_selection === 'mnemonic'">
          <q-field :error="!!mnemonic_error" :error-label="mnemonic_error" helper="Mnemonic and passphrase for account import">
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_word"  float-label="Words" />
            <q-input color="cyan-8" @keyup.enter="importMnemonic" v-model="mnemonic_passphrase"  float-label="Passphrase" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importMnemonic" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'secret_key'">
          <q-field :error="!!secret_key_error" :error-label="secret_key_error" helper="A string of length 98 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSecretKey" v-model="secret_key"  float-label="Secret key" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSecretKey" label="Import" />
          </div>
        </div>
        <div v-if="op_selection === 'seed'">
          <q-field :error="!!seed_error" :error-label="seed_error" helper="A string of length 54 starts with edsk">
            <q-input color="cyan-8" @keyup.enter="importSeed" v-model="seed"  float-label="Seed" />
          </q-field>
          <div class="center-wrapper">
            <q-btn color="cyan-8" outline @click="importSeed" label="Import" />
          </div>
        </div>

      </q-step>

    </q-stepper>
  `,
  data() {
    return {
      password: '',
      password_confirm: '',
      password_error: '',

      account_name: '',
      account_name_error: '',

      op_selection: '',

      gen_mnemonic: [],
      gen_mnemonic_error: '',
      gen_mnemonic_passphrase: '',

      mnemonic_error: '',
      mnemonic_word: '',
      mnemonic_passphrase: '',

      secret_key_error: '',
      secret_key: '',

      seed_error: '',
      seed: '',

      current_step: 'account_name'
    }
  },
  watch: {
    op_selection(v) {
      if (this.current_step !== 'op_selection')
        return false

      const pre_process = ({
        'gen_mnemonic': () => {
          this.gen_mnemonic = TZClient.genMnemonic().split(' ')
        }
      })[v]

      if (pre_process) pre_process()
      this.current_step = 'process'
    }
  },
  methods: {
    accountGen(params) {
      return genTZclient(params, this.account_name, this.password)
      .then(() => {
        this.$emit('finish')
        Object.assign(this.$data, this.$options.data())
      })
    },
    importSeed() {
      if (!this.seed) {
        this.seed_error = 'Please input seed'
        return
      }

      this.accountGen({
        seed: this.seed
      })
      .catch(err => this.seed_error = err)
    },
    importSecretKey() {
      if (!this.secret_key) {
        this.secret_key_error = 'Please input secret key'
        return
      }

      this.accountGen({
        secret_key: this.secret_key,
      })
      .catch(err => this.secret_key_error = err)
    },
    importMnemonic() {
      if (!this.mnemonic_word || !this.mnemonic_password) {
        this.mnemonic_error = 'Please input words and password'
        return
      }

      this.accountGen({
        mnemonic: this.mnemonic_word,
        password: this.mnemonic_password
      })
      .catch(err => this.mnemonic_error = err)
    },
    genMnemonic() {
      if (!this.gen_mnemonic_passphrase) {
        this.gen_mnemonic_error = 'Please input password'
        return
      }

      this.accountGen({
        mnemonic: this.gen_mnemonic.join(' '),
        password: this.gen_mnemonic_passphrase
      })
      .catch(err => this.gen_mnemonic_error = err)
    },
    setAccountName() {
      const accounts = getLocal('_')

      if (this.account_name.length === 0)
        this.account_name_error = 'Please input your account name'
      else if (this.account_name in accounts) {
        this.account_name_error = 'This account name has already been used'
      }
      else {
        this.account_name_error = ''
        this.current_step = 'password'
      }
    },
    confirmPassword() {
      if (this.password.length === 0)
        this.password_error = 'Please input your password'
      else if (this.password !== this.password_confirm) {
        this.password_error = 'The two passwords are not equal'
      } else {
        this.current_step = 'op_selection'
      }
    }
  }
})


const domain = 'zeronet.catsigma.com'
components.SettingModal = Vue.component('setting-modal', {
  template: `
    <q-modal v-model="opened" content-css="padding: 24px">
      <q-select color="cyan-8" v-model="host" :options="hosts" float-label="Host"/>
      <q-list link>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="mute"/>
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Mute</q-item-tile>
            <q-item-tile sublabel>Mute for non-spending operations</q-item-tile>
          </q-item-main>
        </q-item>
        <q-item tag="label">
          <q-item-side>
            <q-checkbox color="cyan-8" v-model="timeout"  />
          </q-item-side>
          <q-item-main>
            <q-item-tile label>Timeout</q-item-tile>
            <q-item-tile sublabel>Limit session lifetime of plugin to 30 minutes</q-item-tile>
          </q-item-main>
        </q-item>
      </q-list>

      <q-btn color="cyan-8" outline icon="close" @click="opened = false" label="Close" />
    </q-modal>
  `,
  data() {
    return {
      opened: false,

      mute: !!getLocal('*').mute,
      timeout: !!getLocal('*').timeout,
      host: getLocal('*').host || domain,
      hosts: [{
        label: domain,
        value: domain
      }]
    }
  },
  watch: {
    mute(v) {
      this.valChange('mute', v)
    },
    timeout(v) {
      this.valChange('timeout', v)
    },
    host(v) {
      this.valChange('host', v)
    }
  },
  methods: {
    valChange(name, value) {
      const setting = getLocal('*')
      setting[name] = value
      setLocal('*', setting)
    }
  }
})

module.exports = components

},{}]},{},[1]);
