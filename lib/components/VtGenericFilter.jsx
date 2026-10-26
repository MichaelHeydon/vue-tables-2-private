import RLGenericFilter from "./renderless/RLGenericFilter";
import {h, ref} from "vue"
import omit from "../helpers/omit"

export default {
    name: 'VtGenericFilter',
    inject:['setRef'],
    components: {RLGenericFilter},
    setup() {
        const filter = ref(null);

        return {
            filter,
        };
    },
    mounted() {
        this.setRef('genericFilter', this.$refs.filter)
    },
    render() {
        return h(RLGenericFilter, {}, {
            default: function (props) {
                // Share the timer so Enter cancels the search queued by an input event.
                const search = props.search(props.opts.debounce);
                return props.override ? h(props.override, {
                        props: omit(props)
                    }) :
                    <div class="VueTables__search-field">
                        <label for={`VueTables__search_${props.id}`} class={props.theme.label}>
                            {props.display("filter")}
                        </label>

                        <input class={`VueTables__search__input ${props.theme.input} ${props.theme.small}`}
                               ref="filter"
                               type="text"
                               placeholder={props.display('filterPlaceholder')}
                               onInput={search}
                               onKeyup={e => {
                                   if (e.keyCode === 13) search(e);
                               }}
                               id={`VueTables__search_${props.id}`}
                               autocomplete="off"
                        />
                    </div>
            }
        })
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
