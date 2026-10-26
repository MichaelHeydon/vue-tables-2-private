<template>
    <input
            @input="search"
            @keyup.enter="search"
            :class="props.theme.input"
            :name="props.getColumnName(props.column)"
            type="text"
            :placeholder="props.display('filterBy', {column: props.getHeading(props.column)})"
            autocomplete="off"
    />
</template>

<script>
    export default {
        name: "MyTextFilter",
        props: ['props'],
        computed: {
            search() {
                // Reuse one debounce timer across edits and immediate Enter searches.
                return this.props.search(this.props.debounce);
            }
        }
    }
</script>
