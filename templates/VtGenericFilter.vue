<template>
    <div class="VueTables__search-field">
        <label :for="`VueTables__search_${props.id}`" :class="props.theme.label">
            {{props.display("filter")}}
        </label>

        <input :class="`VueTables__search__input ${props.theme.input} ${props.theme.small}`"
               type="text"
               ref="filter"
               :placeholder="props.display('filterPlaceholder')"
               @input="search"
               @keyup.enter="search"
               :id="`VueTables__search_${props.id}`"
               autocomplete="off"
        />
    </div>
</template>

<script>
    export default {
        name: "MyGenericFilter",
        props: ['props'],
        computed: {
            search() {
                // Reuse one debounce timer across edits and immediate Enter searches.
                return this.props.search(this.props.opts.debounce);
            }
        },
        methods: {
            focus() {
                this.$refs.filter.focus()
            },
            blur() {
                this.$refs.filter.blur()
            }
        }
    }
</script>
