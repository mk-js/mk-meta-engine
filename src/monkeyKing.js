import React from 'react'
import { AppLoader } from 'mk-app-loader'
import componentFactory from './componentFactory'
import omit from 'omit.js'
import config from './config'

function parseMetaProps(meta, props) {
    const ret = {}

    Object.keys(meta).forEach(key => {
        let v = meta[key],
            t = typeof v

        if (v instanceof Array) {
            ret[key] = []
            v.forEach(c => {
                let mc = metaToComponent(c, props)
                if (mc instanceof Array)
                    ret[key] = ret[key].concat(mc)
                else
                    ret[key].push(mc)
            })
        }
        else if (t == 'object') {
            ret[key] = metaToComponent(v, props)
        }
        else if (t == 'function') {
            ret[key] = v()
        }
        else {
            ret[key] = v
        }
    })

    return ret
}

function metaToComponent(meta, props) {
    if (!meta) {
        return meta
    }
    else if (typeof meta == 'object' && meta['$$typeof']) {
        return meta
    }
    else if (typeof meta == 'object' && meta['_isAMomentObject']) {
        return meta
    }
    else if (typeof meta == 'object') {

        if (meta.component) {
            if (typeof meta.component == 'function') {
                meta.component = meta.component()
            }
            if (meta['_visible'] === false)
                return null

            if (typeof meta['_visible'] === 'function' && meta['_visible']() === false)
                return null

            if (meta['_power'] && /for[ ]+in/.test(meta['_power'])) {
                var p = meta['_power']
                    .replace(/for[ ]+in/, '')
                    .replace(' ', '')

                if (p.indexOf('_rowIndex') != -1)
                    p = p.replace('_rowIndex', meta.path.split(',').length > 1 ? meta.path.split(',')[1].replace(' ', '') : 0)

                let items = props.gf(p)

                if (!items || items.size == 0) return
                items = items.toJS()
                return items.map((o, index) => {
                    return metaToComponent({ ...props.gm(meta.path + ',' + index), _power: undefined }, props)
                })
            }

            if (meta['_power'] && meta['_power'].indexOf('=>') != -1) {
                return (...args) => {
                    let varsString = (new Function('return ' + meta['_power']))()(...args)
                    const co = metaToComponent({ ...props.gm(meta.path + ',' + varsString), _power: undefined }, props)
                    return co ? React.cloneElement(co, { path: meta.path + ',' + varsString }) : co
                }
            }

            const componentName = meta.component,
                component = componentFactory.getComponent(props.appName, componentName)

            var allProps = {
                key: meta.path,
                ...props,
                ...parseMetaProps(meta, props),

            }

            allProps = omit(allProps, ['clearAppState', 'component', 'name', 'getDirectFuns', 'initView', 'payload'])

            if (componentName == 'AppLoader') {
                if (!allProps.appName)
                    return null
                return React.createElement(component, { ...allProps, name: allProps.appName })
            }
            //else if (typeof component == 'string' || component.prototype.isReactComponent) {
            return React.createElement(component, allProps)
            //}
            //else {
            //    return component(allProps)
            //}
        }
        else {
            return parseMetaProps(meta, props)
        }
    }
    else {
        return meta
    }
}

const MonkeyKing = (props) => {
    const { path, gm } = props
    return metaToComponent(gm(path), props)
}

export default MonkeyKing