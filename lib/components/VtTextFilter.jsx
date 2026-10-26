import RLTextFilter from "./renderless/RLTextFilter";
import {h,ref} from "vue"
import omit from "../helpers/omit"

export default {
    name: 'VtTextFilter',
    inject:['setFilterRef'],
    props: {
        column: {
            required: true,
            type: String
        }
    },
    components: {RLTextFilter},
     setup() {
        const filter = ref(null);

        return {
            filter,
        };
    },
    mounted() {
        this.setFilterRef(this.column, this.$refs.filter)
    },
    render() {
        return h(RLTextFilter, {
            column: this.column
        }, {
            default: (props) => {
                // Share the timer so Enter cancels the search queued by an input event.
                const search = props.search(props.debounce);
                return props.override ? h(props.override, {
                    props: omit(props)
                }) : <input
                    ref="filter"
                    onInput={search}
                    onKeyup={e => {
                        if (e.keyCode === 13) search(e);
                    }}
                    class={props.theme.input}
                    name={props.name}
                    type="text"
                    placeholder={props.display('filterBy', {column: props.getHeading(this.column)})}
                    autocomplete="off"
                />
            }
        })
    }
}

