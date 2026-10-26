const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('jsdom-global')();
const sinon = require('sinon');
// Vue 3.0 captures Date.now at import; install the clock before loading its event runtime.
const clock = sinon.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
const Vue = require('vue');
const {createApp, compile} = Vue;
const searchFactory = require('../compiled/methods/search');
const clientSearch = require('../compiled/methods/client-search');
const serverSearch = require('../compiled/methods/server-search');
const getName = require('../compiled/methods/get-name');

after(() => { clock.restore(); });

function templateComponent(name) {
    const source = fs.readFileSync(path.join(__dirname, '../templates', name + '.vue'), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const component = new Function(script.replace('export default', 'return'))();
    component.render = compile(source.match(/<template>([\s\S]*?)<\/template>/)[1]);
    return component;
}

// Mount the shipped inputs with real search methods, without the legacy Vue 2 table test setup.
function mountFilter(kind, column, source, debounce) {
    const state = {
        source, data: [{name: 'Yemen'}, {name: 'Zimbabwe'}],
        query: column ? {name: ''} : '', vuex: false, page: 2,
        opts: {filterByColumn: column, customFilters: [], dateColumns: [], filterAlgorithm: {}},
        customQueries: {}, filterableColumns: ['name'], calls: 0,
        getName, setPage(page) { this.page = page; },
        updateState() {}, dispatch() {}, getData() { this.calls++; },
        isListFilter: () => false, dateFormat: () => '',
        _getValue: (row, key) => row[key],
        search(data, event) {
            this.calls++;
            this.rows = clientSearch.call(this, data, event);
        },
        serverSearch,
    };
    const opts = {debounce};
    const props = {
        opts, debounce, column: 'name', name: column ? 'vf__name' : '',
        search: searchFactory.bind(state), query: state.query,
        theme: {}, display: () => '', id: 'search-test',
        getHeading: () => 'name', getColumnName: () => 'vf__name',
    };
    const name = column ? 'VtTextFilter' : 'VtGenericFilter';
    const component = kind === 'template' ? templateComponent(name) : require('../compiled/components/' + name).default;
    const app = createApp(component, kind === 'template' ? {props} : {column: 'name'});
    const provided = {
        ...props, opts: () => opts, query: () => state.query, source,
        componentsOverride: {}, setRef() {}, setFilterRef() {},
    };
    Object.keys(provided).forEach(key => app.provide(key, provided[key]));
    const container = document.createElement('div');
    document.body.appendChild(container);
    app.mount(container);
    const input = container.querySelector('input');
    return {
        state,
        edit(value) {
            input.value = value;
            // Context-menu edits and fill() change the value without releasing a key.
            input.dispatchEvent(new window.Event('input', {bubbles: true}));
        },
        keyup(key, keyCode) {
            input.dispatchEvent(new window.KeyboardEvent('keyup', {key, keyCode, bubbles: true}));
        },
        query: () => column ? state.query.name : state.query,
        destroy() { app.unmount(); container.remove(); },
    };
}

for (const kind of ['builtin', 'template']) {
    for (const source of ['client', 'server']) {
        for (const column of [false, true]) {
            describe(`${kind} ${source} ${column ? 'column' : 'global'} text search`, () => {
                let filter;
                afterEach(() => {
                    if (filter) filter.destroy();
                    filter = null;
                    clock.runAll();
                });

                for (const delay of [0, 100]) {
                    it(`searches and clears on input without keyup (debounce ${delay})`, () => {
                        filter = mountFilter(kind, column, source, delay);
                        filter.edit('Yemen');
                        clock.tick(delay);
                        assert.strictEqual(filter.query(), 'Yemen');
                        assert.strictEqual(filter.state.calls, 1);
                        assert.strictEqual(filter.state.page, 1);
                        if (source === 'client') assert.deepStrictEqual(filter.state.rows, [{name: 'Yemen'}]);
                        filter.edit('');
                        clock.tick(delay);
                        assert.strictEqual(filter.query(), '');
                        assert.strictEqual(filter.state.calls, 2);
                        if (source === 'client') assert.deepStrictEqual(filter.state.rows, filter.state.data);
                    });
                }

                it('debounces rapid edits and ignores ordinary key releases', () => {
                    filter = mountFilter(kind, column, source, 100);
                    filter.edit('Ye');
                    filter.keyup('e', 69);
                    clock.tick(50);
                    filter.edit('Yemen');
                    filter.keyup('n', 78);
                    clock.tick(99);
                    assert.strictEqual(filter.state.calls, 0);
                    clock.tick(1);
                    assert.strictEqual(filter.query(), 'Yemen');
                    assert.strictEqual(filter.state.calls, 1);
                    filter.keyup('Tab', 9);
                    filter.keyup('ArrowLeft', 37);
                    clock.tick(100);
                    assert.strictEqual(filter.state.calls, 1);
                });

                it('searches immediately on Enter and cancels the pending search', () => {
                    filter = mountFilter(kind, column, source, 100);
                    filter.edit('Yemen');
                    assert.strictEqual(filter.state.calls, 0);
                    filter.keyup('Enter', 13);
                    assert.strictEqual(filter.query(), 'Yemen');
                    assert.strictEqual(filter.state.calls, 1);
                    clock.tick(200);
                    assert.strictEqual(filter.state.calls, 1);
                });
            });
        }
    }
}

describe('shipped client table entry points', () => {
    for (const artifact of ['compiled/index.js', 'dist/vue-tables-3.npm.min.js',
        'dist/vue-tables-3.cdn.min.js', 'dist/vue-tables-3.cdn.js']) {
        it(`searches and clears without keyup through ${artifact}`, async () => {
            const filename = path.join(__dirname, '..', artifact);
            let library;
            if (artifact.includes('.cdn')) {
                // Run the browser bundle with its real Vue global and the same fake clock.
                const context = {Vue, console, Date, setTimeout, clearTimeout};
                vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
                library = context.VueTables;
            } else {
                library = require(filename);
            }
            const container = document.createElement('div');
            document.body.appendChild(container);
            const app = createApp({
                render() {
                    return Vue.h(Vue.resolveComponent('v-client-table'), {
                        columns: ['name'], data: [{name: 'Yemen'}, {name: 'Zimbabwe'}],
                        options: {debounce: 100, resizableColumns: false},
                    });
                }
            });
            app.use(library.ClientTable);
            try {
                app.mount(container);
                const input = container.querySelector('.VueTables__search__input');
                for (const value of ['Yemen', '']) {
                    input.value = value;
                    input.dispatchEvent(new window.Event('input', {bubbles: true}));
                    clock.tick(100);
                    await Vue.nextTick();
                    const rows = container.querySelectorAll('tbody tr');
                    assert.strictEqual(rows.length, value ? 1 : 2);
                    assert(rows[0].textContent.includes('Yemen'));
                }
            } finally {
                app.unmount();
                container.remove();
            }
        });
    }
});
